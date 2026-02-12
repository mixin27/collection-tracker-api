import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { LoansService } from './loans.service';
import { CreateLoanDto, LoanResponseDto, ReturnLoanDto } from './dto/loan.dto';

@ApiTags('loans')
@ApiBearerAuth()
@Controller()
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post('items/:itemId/loans')
  @ApiOperation({ summary: 'Create loan for an item' })
  @ApiResponse({
    status: 201,
    description: 'Loan created successfully',
    type: LoanResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async createLoan(
    @CurrentUser('userId') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CreateLoanDto,
  ) {
    return this.loansService.createLoan(userId, itemId, dto);
  }

  @Get('items/:itemId/loans')
  @ApiOperation({ summary: 'Get loans for an item' })
  @ApiResponse({ status: 200, description: 'Loan list' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async getItemLoans(
    @CurrentUser('userId') userId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.loansService.getItemLoans(userId, itemId);
  }

  @Patch('loans/:id/return')
  @ApiOperation({ summary: 'Mark loan as returned' })
  @ApiResponse({
    status: 200,
    description: 'Loan marked as returned',
    type: LoanResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Loan not found' })
  async returnLoan(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: ReturnLoanDto,
  ) {
    return this.loansService.returnLoan(userId, id, dto);
  }

  @Get('loans/overdue')
  @ApiOperation({ summary: 'Get overdue loans' })
  @ApiResponse({ status: 200, description: 'Overdue loan list' })
  async getOverdue(@CurrentUser('userId') userId: string) {
    return this.loansService.getOverdueLoans(userId);
  }
}
