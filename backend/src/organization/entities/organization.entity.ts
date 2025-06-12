import { Organization } from '@prisma/client';

export class OrganizationEntity implements Organization {
  id: number;
  name: string;
  logo: string | null;
  primaryColor: string | null;
  footerMarkdown: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<OrganizationEntity>) {
    Object.assign(this, partial);
  }
}
