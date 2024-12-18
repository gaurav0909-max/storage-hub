"use server"

import { ID, Query } from "node-appwrite"
import { createAdminClient } from "../appwrite"
import { appwriteConfig } from "../appwrite/config"
import { avatarPlaceholderUrl } from "@/constants";
import { parseStringify } from "../utils";
import { cookies } from "next/headers";


const getUserByEmail = async (email: string) => {
    const { databases } = await createAdminClient();
    const user = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [Query.equal("email", [email])],
    );

    return user.total > 0 ? user.documents[0] : null;
};

const handleError = (error: unknown, message: string) => {
    console.log(error, message)
    throw error;
}

export const sendEmailOTP = async ({ email }: { email: string }) => {
    const { account } = await createAdminClient()
    try {
        const session = await account.createEmailToken(ID.unique(), email)
        return session.userId
    } catch (error) {
        handleError(error, "Failed to send email OTP")
    }
}

export const createAccount = async ({
    fullName,
    email,
}: {
    fullName: string;
    email: string;
}) => {
    const existingUser = await getUserByEmail(email);

    const accountId = await sendEmailOTP({ email });
    if (!accountId) throw new Error("Failed to send an OTP");

    if (!existingUser) {
        const { databases } = await createAdminClient();

        await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            ID.unique(),
            {
                fullName,
                email,
                avatar: avatarPlaceholderUrl,
                accountId,
            },
        );
    }

    return parseStringify({ accountId });
};

export const verfiySecret = async ({ accountId, password }: { accountId: string, password: string }) => {
    try {
        const { account } = await createAdminClient()
        const session = await account.createSession(accountId, password);
        (await cookies()).set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "strict",
        });

        return parseStringify({ sessionId: session.$id })
    } catch (error) {
        handleError(error, "Failed to verify OTP")
    }
}

export const signInUser = async ({ email }: { email: string }) => {
    try {
        const existingUser = await getUserByEmail(email);

        // User exists, send OTP
        if (existingUser) {
            await sendEmailOTP({ email });
            return parseStringify({ accountId: existingUser.accountId });
        }

        return parseStringify({ accountId: null, error: "User not found" });
    } catch (error) {
        handleError(error, "Failed to sign in user");
    }
};