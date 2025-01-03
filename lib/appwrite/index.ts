"use server";

import { Account, Databases, Client } from "node-appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { cookies } from "next/headers";

export const createSessionClient = async () => {
    const client = new Client()
        .setEndpoint(appwriteConfig.endpointUrl)
        .setProject(appwriteConfig.projectId);

    const session = (await cookies()).get("appwrite-session");

    if (!session || !session.value) {
        console.warn("Session missing or expired. Redirecting to login.");
        throw new Error("No session found.");
    }

    try {
        client.setSession(session.value);
    } catch (error) {
        console.error("Failed to set session:", error);
        throw new Error("Invalid session.");
    }

    return {
        get account() {
            return new Account(client);
        },
        get databases() {
            return new Databases(client);
        },
    };
};
