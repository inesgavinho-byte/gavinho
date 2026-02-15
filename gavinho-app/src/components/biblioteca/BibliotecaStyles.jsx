export default function BibliotecaStyles() {
  return (
    <style>{`
      .biblioteca-masonry {
        column-count: 4;
        column-gap: 16px;
      }
      @media (max-width: 1400px) {
        .biblioteca-masonry { column-count: 3; }
      }
      @media (max-width: 1000px) {
        .biblioteca-masonry { column-count: 2; }
      }
      @media (max-width: 600px) {
        .biblioteca-masonry { column-count: 1; }
      }

      .biblioteca-grid-regular {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 16px;
      }
      .biblioteca-grid-regular .bib-pin-card {
        margin-bottom: 0;
      }
      @media (max-width: 600px) {
        .biblioteca-grid-regular { grid-template-columns: 1fr; }
      }

      .bib-pin-card {
        break-inside: avoid;
        margin-bottom: 16px;
        border-radius: 12px;
        overflow: visible;
        background: white;
        border: 1px solid var(--stone);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        cursor: default;
        position: relative;
      }
      .bib-pin-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.10);
      }

      .bib-pin-image-wrap {
        position: relative;
        overflow: hidden;
        cursor: pointer;
        line-height: 0;
        background: var(--cream);
        border-radius: 12px 12px 0 0;
      }

      .bib-pin-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.35);
        opacity: 0;
        transition: opacity 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .bib-pin-card:hover .bib-pin-overlay {
        opacity: 1;
      }

      .bib-pin-overlay-btn {
        background: white;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s ease;
      }
      .bib-pin-overlay-btn:hover {
        transform: scale(1.1);
      }

      .bib-pin-fav-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
        transition: transform 0.15s ease;
        z-index: 2;
      }
      .bib-pin-fav-btn:hover {
        transform: scale(1.15);
      }

      .bib-pin-ext-link {
        position: absolute;
        top: 8px;
        left: 8px;
        background: rgba(255,255,255,0.85);
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        z-index: 2;
      }
      .bib-pin-ext-link:hover {
        background: white;
      }

      .bib-pin-action-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .bib-pin-action-btn:hover {
        background: var(--stone);
      }

      .bib-pin-menu {
        position: absolute;
        right: 0;
        top: 100%;
        background: white;
        border: 1px solid var(--stone);
        border-radius: 10px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.12);
        z-index: 100;
        min-width: 140px;
      }

      .bib-pin-menu-item {
        width: 100%;
        padding: 9px 14px;
        background: none;
        border: none;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 13px;
        transition: background 0.15s;
      }
      .bib-pin-menu-item:hover {
        background: var(--cream);
      }
    `}</style>
  )
}
