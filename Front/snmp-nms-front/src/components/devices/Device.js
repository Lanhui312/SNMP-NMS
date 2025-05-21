import React, { useEffect } from "react";
import DeviceInfo from "./DeviceInfo";
import useFetch from "../useFetch";
import { useAuth } from "../../AuthContext";

const Device = () => {
  const { isLoggedIn } = useAuth()
  const { response, isLoading, error, fetchData } = useFetch();

  useEffect(() => {
    fetchData("http://localhost:5000/api/devices");
  }, [fetchData]);

  if (!isLoggedIn) {
    return <h1>Please log in to view this page.</h1>;
  }
  const handleDelete = async (ipAddress) => {
    await fetchData(`http://localhost:5000/api/devices/${ipAddress}`, {
      method: "DELETE",
    });

    // Assuming fetchData to re-fetch is correctly updating the state
    if (response.status === 200) {
      fetchData("http://localhost:5000/api/devices"); // Re-fetch the list of devices
    } else {
      alert("Failed to delete the device. Please try again.");
    }
  };

  return (
    <div className="devices">
      {error && <div>{error}</div>}
      {isLoading && <div>Loading...</div>}
      {response && response.data && (
        <DeviceInfo devices={response.data} handleDelete={handleDelete} />
      )}
    </div>
  );
};

export default Device;
