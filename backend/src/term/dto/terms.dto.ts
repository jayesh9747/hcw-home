import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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

   
  @IsNumber()
  organizationId: number;
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
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;
  
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 10;
  
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    organizationId?: number;
  }
  
