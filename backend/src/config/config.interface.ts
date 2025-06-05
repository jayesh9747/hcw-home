import { Environment } from "./environment.enum";

export interface AppConfig {
  port: number;
  environment: Environment;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  cors: {
    origin: string;
  };
  swagger: {
    title: string;
    description: string;
    version: string;
  };
}
