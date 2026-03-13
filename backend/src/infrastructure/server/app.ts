import express from "express";
import { router } from "../../adapters/inbound/http/router";

export const app = express();

app.use(express.json());
app.use("/api", router);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
