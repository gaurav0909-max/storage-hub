"use server";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { Query, ID } from "node-appwrite";
import { parseStringify } from "@/lib/utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "@/constants";
import { redirect } from "next/navigation";

const getUserByEmail = async (email: string) => {
    const { databases } = await createAdminClient();

    const result = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [Query.equal("email", [email])],
    );

    return result.total > 0 ? result.documents[0] : null;
};

const handleError = (error: unknown, message: string) => {
    console.log(error, message);
    throw error;
};

export const sendEmailOTP = async ({ email }: { email: string }) => {
    const { account } = await createAdminClient();

    try {
        const session = await account.createEmailToken(ID.unique(), email);

        return session.userId;
    } catch (error) {
        handleError(error, "Failed to send email OTP");
    }
};

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

export const verifySecret = async ({
    accountId,
    password,
}: {
    accountId: string;
    password: string;
}) => {
    try {
        console.log("Verifying secret for accountId:", accountId);

        const { account } = await createAdminClient();
        console.log("Admin client created successfully");

        const session = await account.createSession(accountId, password);
        console.log("Session created:", session);

        const cookie = await cookies();
        cookie.set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });
        console.log("Cookie set for session");

        return parseStringify({ sessionId: session.$id });
    } catch (error) {
        console.error("Error in verifySecret:", error);
        handleError(error, "Failed to verify OTP");
    }
};


export const signInUser = async ({ email }: { email: string }) => {
    try {
        console.log("Attempting to sign in user with email:", email);
        const existingUser = await getUserByEmail(email);

        if (existingUser) {
            console.log("User found:", existingUser);
            await sendEmailOTP({ email });
            console.log("OTP sent to:", email);
            return parseStringify({ accountId: existingUser.accountId });
        }

        console.warn("User not found for email:", email);
        return parseStringify({ accountId: null, error: "User not found" });
    } catch (error) {
        console.error("Error in signInUser:", error);
        handleError(error, "Failed to sign in user");
    }
};


export const getCurrentUser = async () => {
    try {
        const { databases, account } = await createSessionClient();

        const result = await account.get();

        const user = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.usersCollectionId,
            [Query.equal("accountId", result.$id)],
        );

        if (user.total <= 0) return null;

        return parseStringify(user.documents[0]);
    } catch (error) {
        console.log(error);
    }
};

export const signOutUser = async () => {
    const { account } = await createSessionClient();

    try {
        await account.deleteSession("current");
        (await cookies()).delete("appwrite-session");
    } catch (error) {
        handleError(error, "Failed to sign out user");
    } finally {
        redirect("/sign-in");
    }
};