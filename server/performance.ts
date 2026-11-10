import { performance } from 'node:perf_hooks';
/** Misure del processo mantenute fuori dal trasporto e dalla simulazione. */
export function measureProcess() {
  const metrics={cpuPercent:0,eventLoopPercent:0};
  let previousCpu=process.cpuUsage(),previousTime=performance.now(),previousLoop=performance.eventLoopUtilization();
  const timer=setInterval(()=>{
    const now=performance.now(),cpu=process.cpuUsage(),loop=performance.eventLoopUtilization();
    metrics.cpuPercent=Math.round((cpu.user+cpu.system-previousCpu.user-previousCpu.system)/((now-previousTime)*1000)*1000)/10;
    metrics.eventLoopPercent=Math.round(performance.eventLoopUtilization(loop,previousLoop).utilization*1000)/10;
    previousCpu=cpu;previousTime=now;previousLoop=loop;
  },2000);
  timer.unref();
  return{metrics,stop:()=>clearInterval(timer)};
}
