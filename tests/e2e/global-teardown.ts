import { removeE2eDatabase } from "./database";

export default async function globalTeardown() {
  await removeE2eDatabase();
}
