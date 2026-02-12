import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateLoanDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  borrowerName: string;

  @ApiProperty({ example: '+1-555-0100', required: false })
  @IsOptional()
  @IsString()
  borrowerContact?: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsOptional()
  @IsEmail()
  borrowerEmail?: string;

  @ApiProperty({ example: '2026-02-12T10:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  loanDate?: string;

  @ApiProperty({ example: '2026-03-01T10:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ example: 'Handle with care', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnLoanDto {
  @ApiProperty({ example: '2026-02-20T10:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  returnedDate?: string;
}

export class LoanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  itemId: string;

  @ApiProperty()
  borrowerName: string;

  @ApiProperty({ nullable: true })
  borrowerContact: string | null;

  @ApiProperty({ nullable: true })
  borrowerEmail: string | null;

  @ApiProperty()
  loanDate: Date;

  @ApiProperty({ nullable: true })
  dueDate: Date | null;

  @ApiProperty({ nullable: true })
  returnedDate: Date | null;

  @ApiProperty({ nullable: true })
  notes: string | null;
}
