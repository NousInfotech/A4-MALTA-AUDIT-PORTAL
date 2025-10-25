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

    // (data.initialized);

    // (data.url );

    // (data.spreadsheetId);

    // (data.sheets);

    return data;
  } catch (error) {
    console.error("Error fetching working paper details:", error);
  }
};

export const getETBCloudFileId = async (
  engagementId: string,
  classification: string
) => {
  try {
    const response = await axiosInstance.get(
      `/api/engagements/${engagementId}/etb/classification/${encodeURIComponent(
        classification
      )}` // /:id/etb/classification/:classification
    );

    const data = response.data;

    // data.rows
    // data.spreadsheetUrl
    // data.spreadsheetId
    // data.section
    // data.message

    return data;
  } catch (error) {
    console.error("Error fetching ETB details:", error);
  }
};