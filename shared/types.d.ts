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
  entityType: "Movie";

};

export type ActorItem = Actor & {
  PK: string;
  SK: string;
  entityType: "Actor";

};

export type RoleItem = Role & {
  PK: string;
  SK: string;
  entityType: "Role";
};



export type AddRoleBody = {
  movieId: number;
  actorId: string;
  roleName: string;
  roleDescription: string;
};


export type MovieRoleQueryParams = {
  actor?: string;
};

export type ActorQueryParams = {
  movie?: string;
};


export type SignUpBody = {
  username: string;
  password: string;
  email: string;
};

export type ConfirmSignUpBody = {
  username: string;
  code: string;
};

export type SignInBody = {
  username: string;
  password: string;
};