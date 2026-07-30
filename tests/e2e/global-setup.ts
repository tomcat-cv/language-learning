import { prepareE2eDatabase } from "./database";

export default async function globalSetup() {
  await prepareE2eDatabase();
}
