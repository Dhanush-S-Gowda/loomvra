import React from 'react';
import { useParams } from "react-router";

function Project() {
  const { pid } = useParams();
  return (
    <div>
      Project {pid}
    </div>
  );
}

export default Project;
