import React from "react";
import "./ShowError.css";

export interface ShowErrorProps {
  errorName: string;
  description: string;
}

const ShowError: React.FC<ShowErrorProps> = ({ errorName, description }) => {
  return (
    <div className="error-container">
      <h3 className="error-name">{errorName}</h3>
      <p className="error-description">{description}</p>
    </div>
  );
};

export default ShowError;
