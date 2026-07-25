import { Movie, Actor, Role } from "../shared/types";

export const movies: Movie[] = [
  {
    movieId: 1234,
    title: "The Shawshank Redemption",
    releaseDate: "1995-03-05",
    overview:
      "A banker convicted of murder forms a friendship with a fellow inmate while serving his sentence.",
  },
  {
    movieId: 2345,
    title: "The Dark Knight",
    releaseDate: "2008-07-18",
    overview:
      "Batman faces a criminal mastermind whose actions create chaos throughout Gotham.",
  },
];

export const actors: Actor[] = [
  {
    actorId: 4321,
    name: "Morgan Freeman",
    dateOfBirth: "1937-06-01",
    bio:
      "An American actor, producer and narrator with a career spanning several decades.",
  },
  {
    actorId: 4322,
    name: "Tim Robbins",
    dateOfBirth: "1958-10-16",
    bio:
      "An American actor, director, producer and screenwriter.",
  },
  {
    actorId: 5432,
    name: "Christian Bale",
    dateOfBirth: "1974-01-30",
    bio:
      "An actor known for leading and character roles across multiple film genres.",
  },
];

export const roles: Role[] = [
  {
    movieId: 1234,
    actorId: "4321",
    roleName: "Ellis Boyd Red Redding",
    roleDescription:
      "A long-term inmate who becomes Andy Dufresne's close friend and serves as the film's narrator.",
  },
  {
    movieId: 1234,
    actorId: "4322",
    roleName: "Andy Dufresne",
    roleDescription:
      "A banker imprisoned for murder who maintains hope while serving his sentence.",
  },
  {
    movieId: 2345,
    actorId: "5432",
    roleName: "Bruce Wayne",
    roleDescription:
      "A billionaire who protects Gotham City under the identity of Batman.",
  },
];