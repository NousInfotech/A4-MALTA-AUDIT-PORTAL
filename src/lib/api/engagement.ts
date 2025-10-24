import axiosInstance from "../axiosInstance";

export const getWorkingPapersCloudFileId = async (
  engagementId: string,
  classification: string
) => {
  try {
    const response = await axiosInstance.get(
      `/api/engagements/${engagementId}/sections/${encodeURIComponent(
        classification
      )}/working-papers/status`
    );

    const data = response.data;

    // setWorkingPapersInitialized(data.initialized);

    // setWorkingPapersUrl(data.url || "");

    // setWorkingPapersId(data.spreadsheetId || "");

    // setAvailableSheets(data.sheets || []);

    return data;
  } catch (error) {
    console.error("Error checking working papers status:", error);
  }
};
