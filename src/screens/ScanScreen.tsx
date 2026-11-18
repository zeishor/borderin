import { useEffect, useRef, useState } from 'preact/hooks';
import { back, go } from '../router';
import { newId, saveBilet } from '../store';
import { parseBilet } from '../bilet';
import { canvasDinVideo, cautaIntrarea, creeazaWorker, recunoaste } from '../ocr';

const PAUZA_MS = 200;

/** Camera citește continuu și se oprește singură când găsește suma și ora plății pe bilet. */
export function ScanScreen({ cursaId }: { cursaId: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Pornesc camera…');
  const [eroare, setEroare] = useState<string>();
  const [cadre, setCadre] = useState(0);

  useEffect(() => {
    let oprit = false;
    let stream: MediaStream | undefined;
    let worker: Awaited<ReturnType<typeof creeazaWorker>> | undefined;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (oprit || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();

        setStatus('Încarc citirea… (prima oară durează)');
        worker = await creeazaWorker();
        if (oprit) return;

        while (!oprit) {
          setStatus('Ține biletul în cadru, drept și nemișcat');
          const canvas = canvasDinVideo(video.current, 1600);
          const data = await recunoaste(worker, canvas);
          if (oprit) return;
          setCadre((n) => n + 1);

          let text = data.text;
          let x = parseBilet(text);
          if (x.suma && x.iesire) {
            oprit = true;
            setStatus('Am găsit biletul, citesc ora de intrare…');
            if (!x.intrare) {
              const extra = await cautaIntrarea(worker, canvas, data);
              if (extra) {
                text = `${text}\n${extra}`;
                x = parseBilet(text);
              }
            }
            const foto = await new Promise<Blob | null>((r) =>
              canvasDinVideo(video.current!, 2400).toBlob(r, 'image/jpeg', 0.9),
            );
            const acum = Date.now();
            const id = newId();
            await saveBilet({
              id,
              cursaId,
              creat: acum,
              modificat: acum,
              suma: x.suma,
              moneda: x.moneda ?? 'HUF',
              intrare: x.intrare,
              iesire: x.iesire,
              numar: x.numar,
              foto: foto ?? undefined,
              textOcr: text,
            });
            go(`/bilet/${id}`);
            return;
          }
          await new Promise((r) => setTimeout(r, PAUZA_MS));
        }
      } catch (e) {
        const nume = e instanceof DOMException ? e.name : '';
        setEroare(
          nume === 'NotAllowedError'
            ? 'Nu am voie să folosesc camera. Permite accesul la cameră pentru acest site sau folosește „Fă poză biletului".'
            : e instanceof Error
              ? e.message
              : String(e),
        );
      }
    })();

    return () => {
      oprit = true;
      stream?.getTracks().forEach((t) => t.stop());
      void worker?.terminate();
    };
  }, []);

  return (
    <div class="scan">
      <video ref={video} playsInline muted />
      <div class="scan-cadru" />
      <div class="scan-jos">
        <p>{eroare ? <span class="eroare-scan">{eroare}</span> : status}</p>
        {!eroare && cadre > 0 && <p class="mic">Cadre citite: {cadre}</p>}
        <button onClick={() => back(`/cursa/${cursaId}`)}>Anulează</button>
      </div>
    </div>
  );
}
