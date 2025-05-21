import { useState, useCallback } from "react";

const useFetch = () => {
  const [response, setResponse] = useState({ data: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (url, options = {}) => {
    setIsLoading(true);
    let res;
    try {
      const token = localStorage.getItem("token");
      const headers = {
        Authorization: token ? `Bearer ${token}` : "",
        ...options.headers,
      };
      const res = await fetch(url, { ...options, headers });
      const jsonData = await res.json();
      const newResponse = {
        status: res.status,
        data: jsonData,
      };
      if (!res.ok) {
        throw new Error(jsonData.message || "Failed to fetch data");
      }
      setResponse(newResponse);
      return newResponse;  // Return the response directly here
    } catch (err) {
      setError(err.message);
      setResponse({
        status: res?.status,
        data: {},
      });
      return { status: res?.status, data: {} };  // Return this structure in case of an error
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { response, isLoading, error, fetchData };
};

export default useFetch;

