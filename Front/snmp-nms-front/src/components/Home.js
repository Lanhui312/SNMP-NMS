const Home = () => {
  return (
    <div className="home">
      <div className="welcome-container">
        <h1 className="welcome-title">Welcome to SNMP-NMS</h1>
        <p className="welcome-description">
          Manage your SNMP-enabled devices with ease! This platform allows you
          to:
        </p>
        <ul className="features-list">
          <li>Monitor the state of your devices</li>
          <li>Retrieve detailed information about each device</li>
          <li>Delete devices (Admin-level access required)</li>
          <li>View all devices (User-level access)</li>
        </ul>
        <p className="login-reminder">
          <strong>Please log in</strong> to get started and access the full
          functionality.
        </p>
      </div>
    </div>
  );
};

export default Home;
