import React from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import InputBar from "./InputBar";

export default function ChatArea() {
  return (
    <main className="chat">
      <ChatHeader />
      <MessageList />
      <InputBar />
    </main>
  );
}
