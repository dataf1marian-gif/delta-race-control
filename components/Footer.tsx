/** Atribución OpenF1 + disclaimer "no oficial" — siempre visible (requisito legal, brief §3). */
export function Footer({ source }: { source: string }) {
  return (
    <footer className="mt-5 px-4 text-center font-mono text-[9px] leading-[1.7] tracking-[1px] text-ink-faint">
      Datos vía{' '}
      <a href="https://openf1.org" target="_blank" rel="noopener noreferrer" className="text-ink-dim underline">
        OpenF1 (openf1.org)
      </a>{' '}
      · clasificación, control de carrera, sectores, pits, neumáticos y clima.
      <div className="mt-2 inline-block rounded-sm border border-line px-[9px] py-1 text-ink-dim">{source}</div>
      <p className="mt-2.5 text-[8px] leading-[1.6] opacity-85">
        Proyecto no oficial, sin afiliación a la Fórmula 1. &quot;F1&quot;, &quot;FORMULA 1&quot;, &quot;GRAND PRIX&quot; y
        marcas relacionadas son de Formula One Licensing BV. DELTA es un nombre y branding propios. Los colores de equipo se
        usan solo como indicador de dato.
      </p>
    </footer>
  );
}
