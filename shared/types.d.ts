export type Movie = {
  movieId: number;
  title: string;
  releaseDate: string;
  overview: string;
};

export type Actor = {
  actorId: number;
  name: string;
  dateOfBirth: string;
  bio: string;
};

export type Role = {
  movieId: number;
  actorId: string;
  roleName: string;
  roleDescription: string;
};

// DynamoDB rep

export type MovieItem = Movie & {
  PK: string;
  SK: string;
};

export type ActorItem = Actor & {
  PK: string;
  SK: string;
};

export type RoleItem = Role & {
  PK: string;
  SK: string;
};