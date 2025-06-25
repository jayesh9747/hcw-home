export interface InviteFormData {
  id?: string;
  firstName: string;
  lastName: string;
  gender: string;
  language: string;
  group?: string;
  contact: string;
  manualSend: boolean;
  planLater: boolean;
  guests: {
    lovedOne: boolean;
    colleague: boolean;
  };
}
