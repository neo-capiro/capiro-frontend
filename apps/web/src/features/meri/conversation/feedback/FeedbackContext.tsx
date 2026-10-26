"use client";
import { createContext, useContext } from "react";
import type { MeriConversationPort } from "../../../../shared/meri-conversations/host-controller";
export const FeedbackContext = createContext<MeriConversationPort | null>(null);
export const useFeedbackPort = () => useContext(FeedbackContext);
