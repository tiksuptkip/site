let cachedIp: string | null = null;

export async function fetchUserIp(): Promise<string> {
  if (cachedIp) return cachedIp;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        cachedIp = data.ip;
        return data.ip;
      }
    }
  } catch (err) {
    console.warn('Could not fetch external IP via primary provider:', err);
  }

  try {
    const res2 = await fetch('https://api64.ipify.org?format=json');
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.ip) {
        cachedIp = data2.ip;
        return data2.ip;
      }
    }
  } catch (err2) {
    console.warn('Fallback IP fetch failed:', err2);
  }

  // Fallback to a client IP identifier
  const simulatedIp = '198.51.100.' + (Math.floor(Math.random() * 200) + 10);
  cachedIp = simulatedIp;
  return simulatedIp;
}
