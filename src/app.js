import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

dotenv.config();

const nameSchema = joi.object({
  name: joi.string().required().min(1).max(40),
});

const server = express();
server.use(cors());
server.use(json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

try {
  await mongoClient.connect();
  db = mongoClient.db("BatePapoUol");
} catch (err) {
  console.log(err);
}

// Function Post in route /participants
server.post("/participants", async (req, res) => {
  try {
    const body = req.body;

    const validation = nameSchema.validate(body, { abortEarly: false });

    if (validation.error) {
      res.status(422).send(validation.error.details[0].message);
      return;
    }

    const userAlreadyExist = await db
      .collection("users")
      .findOne({ name: body.name });

    if (userAlreadyExist) {
      res.status(409).send("Usuário já existente");
      return;
    }

    const newParticipant = { name: body.name, lastStatus: Date.now() };
    await db.collection("users").insertOne(body);
    await db.collection("participants").insertOne(newParticipant);

    const arrivedMessage = {
      from: body.name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs(newParticipant.lastStatus).format("HH:mm:ss"),
    };

    await db.collection("messages").insertOne(arrivedMessage);

    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

server.get("/participants", async (req, res) => {
  try {
    const listParticipants = await db
      .collection("participants")
      .find()
      .toArray();

    const newListParticipants = [];

    listParticipants.map((item) => newListParticipants.push(item.name));

    res.send(newListParticipants);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

server.listen(5000, () => {
  console.log("Rodando em http://localhost:5000");
});
