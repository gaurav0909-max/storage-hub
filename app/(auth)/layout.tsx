import Image from "next/image";
import React from "react";

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen">
      <section className="bg-brand p-10">
        <div>
          <Image
            src="/favicon.ico"
            alt="logo"
            width={16}
            height={16}
            className="h-auto"
          />
        </div>
        <div className="space-y-5 text-white">
          <h1 className="h1">Manage your files with StorageHub</h1>
          <p className="body-1 max-w-[600px]">
            StorageHub is a cloud storage platform that allows you to store,
            manage, and share your files securely and efficiently.
          </p>
        </div>
      </section>
      {children}
    </div>
  );
};

export default layout;
