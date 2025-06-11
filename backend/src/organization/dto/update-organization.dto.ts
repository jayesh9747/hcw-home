import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiProperty({
    description: 'Name of the organization',
    example: 'Healthcare Plus Updated',
    minLength: 2,
    maxLength: 100,
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'Logo URL for the organization',
    example: 'https://example.com/new-logo.png',
    required: false,
  })
  logo?: string;

  @ApiProperty({
    description: 'Primary color for branding (hex code)',
    example: '#28a745',
    pattern: '^#[0-9A-Fa-f]{6}$',
    required: false,
  })
  primaryColor?: string;

  @ApiProperty({
    description: 'Footer content in markdown format',
    example: '## Updated Contact\n\nEmail: contact@healthcareplus.com',
    required: false,
  })
  footerMarkdown?: string;
}
