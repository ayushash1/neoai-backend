import express from "express";
import cors from "cors";
import ImageKit from "imagekit";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Chat from "./models/chat.js";
import UserChats from "./models/userChats.js";
import { requireAuth } from "@clerk/express";

dotenv.config();

const port = process.env.PORT || 3000;
const app = express();

// CORS middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

// connect to mongodb
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("connected to MongoDB");
  } catch (error) {
    console.log(error);
  }
};

// imagekit config
const imagekit = new ImageKit({
  urlEndpoint: process.env.IMAGEKIT_ENDPOINT,
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

// imagekit route
app.get("/api/upload", (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
});

// test route
app.get("/api/test", requireAuth(), (req, res) => {
  console.log(req.auth.userId);
});

//* CHAT ROUTE //
app.post("/api/chats", requireAuth(), async (req, res) => {
  // since we are sending data, we need to use post method
  const userId = req.auth.userId;
  const { text } = req.body;
  try {
    // create a new chat
    const newChat = new Chat({
      userId: userId,
      history: [{ role: "user", parts: [{ text: text }] }],
    });

    // save the chat to the database
    const savedChat = await newChat.save();

    //* check if userchats exists
    const userChats = await UserChats.find({ userId: userId });

    // if doesn't exist create an new one and add the chat in the chats array
    if (!userChats.length) {
      // If not exists, create a new UserChats document
      const newUserChats = new UserChats({
        userId: userId,
        chats: [
          {
            _id: savedChat._id,
            title: text.substring(0, 40),
          },
        ],
      });
      await newUserChats.save();
    } else {
      // IF EXISTS, PUSH THE CHAT TO THE EXISTING ARRAY
      await UserChats.updateOne(
        { userId: userId },
        {
          $push: {
            chats: { _id: savedChat._id, title: text.substring(0, 40) },
          },
        }
      );
      res.status(201).send(newChat._id);
    }
  } catch (error) {
    console.error("Error fetching chat:", error.message || error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the chat." });
  }
});

// legacy error handler for ClerkExpressRequireAuth()
// I dont know how to use handler function
/*
const legacyRequireAuth = (req, res, next) => {
  if (!req.auth.userId) {
    return next(new Error('Unauthenticated'))
  }
  next()
}
app.get('/', legacyRequireAuth, handler)
*/

// getting all the userchats
app.get("/api/userchats", requireAuth(), async (req, res) => {
  try {
    const userChats = (await UserChats.find({ userId: req.auth.userId })) || [];
    console.log("User chats response:", userChats[0].chats);
    res.status(200).json(userChats[0].chats);
  } catch (error) {
    console.error("Error fetching userchats:", error.message || error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the userchats." });
  }
});

// getting a specific chat
app.get("/api/chats/:id", requireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      userId: req.auth.userId,
    });
    res.status(200).json(chat);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the chat." });
  }
});

// updating the conversation
app.put("/api/chats/:id", requireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  const { question, ans, img } = req.body;
  const newItems = [
    ...(question
      ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
      : []),
    { role: "model", parts: [{ text: ans }] },
  ];
  try {
    const updatedChat = await Chat.updateOne(
      { _id: req.params.id, userId: userId },
      {
        $push: {
          history: {
            $each: newItems,
          },
        },
      }
    );
    console.log("chat updated")
    res.status(200).json(updatedChat);
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ error: "An error occurred while updating the chat." });
  }
});

// start the server
app.listen(port, () => {
  connect();
  console.log(`Server is running on port ${port}`);
});
