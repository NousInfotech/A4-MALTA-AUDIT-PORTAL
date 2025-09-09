import React, { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import ApideckIntegrationCard from "../apideck/ApideckIntegrationCard";
import ApideckHomePage from "../apideck/ApideckHomePage";
import BankData from "../saltedge/BankData";

interface AccountDataTabProps {}

const AccountDataTab: React.FC<AccountDataTabProps> = () => {
  // Example of how you might handle a successful integration
  const handleApideckSubmit = (integration: any) => {
    console.log("Apideck integration submitted successfully:", integration);
    // You'd typically update your application state here,
    // e.g., show a list of connected integrations.
    // Maybe trigger a re-fetch of user integrations.
  };

  return (
    <Tabs.Root className="flex flex-col w-full max-w-7xl mx-auto my-12 bg-gray-50 rounded-lg shadow-md" defaultValue="saltedge">
      <Tabs.List
        className="flex-shrink-0 flex border-b border-gray-200"
        aria-label="Manage integrations"
      >
        <Tabs.Trigger
          className="bg-white px-5 py-3 flex-1 flex items-center justify-center text-sm font-medium text-gray-700
                     hover:text-blue-600 focus:z-10 focus:outline-none focus-visible:ring focus-visible:ring-blue-500
                     data-[state=active]:text-blue-600 data-[state=active]:shadow-[inset_0_-1px_0_0_currentColor,0_1px_0_0_currentColor]
                     data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-white
                     transition-colors duration-200 ease-in-out
                     first:rounded-tl-lg last:rounded-tr-lg"
          value="apideck"
        >
          Apideck
        </Tabs.Trigger>
        <Tabs.Trigger
          className="bg-white px-5 py-3 flex-1 flex items-center justify-center text-sm font-medium text-gray-700
                     hover:text-blue-600 focus:z-10 focus:outline-none focus-visible:ring focus-visible:ring-blue-500
                     data-[state=active]:text-blue-600 data-[state=active]:shadow-[inset_0_-1px_0_0_currentColor,0_1px_0_0_currentColor]
                     data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-white
                     transition-colors duration-200 ease-in-out
                     first:rounded-tl-lg last:rounded-tr-lg"
          value="saltedge"
        >
          Saltedge Connectivity
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content
        className="flex-grow p-5 bg-white rounded-b-lg focus:outline-none focus-visible:ring focus-visible:ring-blue-500"
        value="apideck"
      >
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Apideck Integration
        </h3>
        <ApideckIntegrationCard onSubmit={handleApideckSubmit} />
        <div className="w-full mt-10">
          <ApideckHomePage />
        </div>
      </Tabs.Content>

      <Tabs.Content
        className="flex-grow p-5 bg-white rounded-b-lg focus:outline-none focus-visible:ring focus-visible:ring-blue-500"
        value="saltedge"
      >
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Saltedge Connectivity
        </h3>
        <p className="text-base text-gray-700 mb-2">
          Saltedge
        </p>
        <p className="text-gray-600 text-sm">
          Information regarding Saltedge Connectivity options.
        </p>
        {/* Placeholder for Saltedge integration component */}
        <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-md text-gray-500 text-center">
          Saltedge Integration goes here.
          <div>
            <BankData />
          </div>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
};

export default AccountDataTab;
