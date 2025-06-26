import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, IsString, MinLength } from 'class-validator';

export class CreatetermDto {
  @ApiProperty({
    description: 'Language of the terms',
    example: 'en',
  })
  @IsString()
  language: string;

  @ApiProperty({
    description: 'Country code for which the terms apply',
    example: 'IN',
  })
  @IsString()
  country: string;

  @ApiProperty({
    description: 'Full content of the terms',
    example: 'These are the terms and conditions...',
  })
  @IsString()
  @MinLength(10)
  content: string;
}



export class UpdateTermDto {
    @ApiProperty({
        description: 'Language of the terms',
        example: 'en',
      })
      @IsString()
      language?: string;
    
      @ApiProperty({
        description: 'Country code for which the terms apply',
        example: 'IN',
      })
      @IsString()
      country?: string;
    
      @ApiProperty({
        description: 'Full content of the terms',
        example: 'These are the terms and conditions...',
      })
      @IsString()
      @MinLength(10)
      content?: string;
  }



export class QueryTermsDto {


  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 10;
}
