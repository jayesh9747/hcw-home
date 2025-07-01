export interface Term {
    id: number;
    language: string;
    country: string;
    content: string;
    version: number;
    createdAt: string;
    updatedAt: string;
    organizationId: number;
    organizationName?: string;
}

export interface TermQuery {
    language?: string;
    country?: string;
    page?: number;
    limit?: number;
    organizationId?: number;
    sortBy?: 'version' | 'id';  
    order?: 'asc' | 'desc';
  }
export interface CreatetermDto {

    language: string;
    country: string;
    content: string;
    organizationId: number;

}



export class UpdateTermDto {

    language?: string;

    country?: string;

    content?: string;
}
