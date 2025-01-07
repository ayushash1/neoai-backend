import mongoose from "mongoose";

const userChatsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  chats: [
    {
      _id: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now(), 
        required: true,
      },
      
    },
  ],
}, { timestamps: true});

export default mongoose.models.userChats || mongoose.model("userchats", userChatsSchema) // 
  // This line creates a model for the userChats collection if it doesn't already exist.
  // The || operator is used to provide a default value if the model doesn't exist.
  // The first part of the expression mongoose.models.userChats attempts to find the model in mongoose's cache.
  // If the model doesn't exist, the second part of the expression mongoose.model("userChats", userChatsSchema) is evaluated and the model is created.
  // The newly created model is then assigned to the export default.
