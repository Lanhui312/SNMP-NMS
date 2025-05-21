import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { isLoggedIn, setIsLoggedIn } = useAuth();

  console.log("Logged In State:", isLoggedIn); // Debug the current logged in state

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("token"); // Ensure you clear any stored session/token
    alert("You have been logged out.");
    navigate("/");
  };

  return (
    <div className="navbar">
      <h1>SNMP</h1>
      <div className="links">
        <button onClick={() => navigate("/")}>Home</button>
        <button onClick={() => navigate("/device")}>Device</button>
        <button onClick={() => navigate("/logRecord")}>Log Record</button>
        {isLoggedIn ? (
          <button onClick={handleLogout}>Logout</button>
        ) : (
          <button onClick={() => navigate("/login")}>Login</button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
