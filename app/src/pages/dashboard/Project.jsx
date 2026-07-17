import { useState, useEffect } from 'react';
import { useParams } from "react-router";
import DesignPlan from '@/components/DesignPlan';
import PreviewGenerated from '@/components/PreviewGenerated';
import { fetchProjectAPI } from '@/lib/mockApi';
import { TriangleAlert } from 'lucide-react';

function Project() {
  const { pid } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectAPI(pid).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [pid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <span className="text-muted-foreground animate-pulse">Loading project…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <span className="text-muted-foreground">No data found.</span>
      </div>
    );
  }

  if (data.state === 'generated') {
    return <PreviewGenerated data={data} />;
  }
  if (data.state === 'design') {
    return <DesignPlan data={data} />;
  }
  return (
    <div className="flex flex-col justify-center h-full">
      <div className="flex flex-col items-center justify-center h-full text-destructive">
        <div className='flex items-center justify-center pb-2'>
          <TriangleAlert className="inline-block mr-2" />
          <span className='text-2xl'>Error from server</span>
        </div>
        <div className='text-foreground'>Unknown keyword: {data.state}</div>
      </div>
    </div>
  );
}

export default Project;
