import React, { useEffect } from "react";
import LogRecord from "./LogRecord";
import useFetch from "../useFetch";
import { useAuth } from "../../AuthContext";

const Logs = () => {
  const { isLoggedIn } = useAuth();
  const { response, isLoading, error, fetchData } = useFetch();

  useEffect(() => {
    fetchData("http://localhost:5000/api/logs");
  }, [fetchData]);

  if (!isLoggedIn) {
    return <h1>Please log in to view this page.</h1>;
  }

  return (
    <div className="logs">
      {error && <div>{error}</div>}
      {isLoading && <div>Loading...</div>}
      {response && response.data && <LogRecord logs={response.data} />}
    </div>
  );
};

export default Logs;
