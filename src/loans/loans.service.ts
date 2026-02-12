import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateLoanDto, ReturnLoanDto } from './dto/loan.dto';

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async createLoan(userId: string, itemId: string, dto: CreateLoanDto) {
    const item = await this.prisma.item.findFirst({
      where: {
        id: itemId,
        isDeleted: false,
        collection: { userId },
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return this.prisma.loan.create({
      data: {
        itemId,
        borrowerName: dto.borrowerName,
        borrowerContact: dto.borrowerContact,
        borrowerEmail: dto.borrowerEmail,
        loanDate: dto.loanDate ? new Date(dto.loanDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
      },
    });
  }

  async getItemLoans(userId: string, itemId: string) {
    const item = await this.prisma.item.findFirst({
      where: {
        id: itemId,
        isDeleted: false,
        collection: { userId },
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const loans = await this.prisma.loan.findMany({
      where: { itemId },
      orderBy: [{ returnedDate: 'asc' }, { loanDate: 'desc' }],
    });

    return { itemId, loans };
  }

  async returnLoan(userId: string, loanId: string, dto: ReturnLoanDto) {
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        item: {
          isDeleted: false,
          collection: { userId },
        },
      },
      select: { id: true },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    return this.prisma.loan.update({
      where: { id: loanId },
      data: {
        returnedDate: dto.returnedDate ? new Date(dto.returnedDate) : new Date(),
      },
    });
  }

  async getOverdueLoans(userId: string) {
    const now = new Date();

    const loans = await this.prisma.loan.findMany({
      where: {
        returnedDate: null,
        dueDate: { lt: now },
        item: {
          isDeleted: false,
          collection: { userId },
        },
      },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            collectionId: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return { loans, total: loans.length };
  }
}
