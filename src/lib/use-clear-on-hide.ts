"use client";

import { useEffect, useRef } from "react";

/**
 * Next 16 (cacheComponents) menyimpan state halaman yang pernah dibuka dan
 * memulihkannya saat halaman itu dibuka lagi, juga setelah keluar dan masuk.
 * Untuk data yang hanya boleh tampil sekali (kode pemulihan) atau data pasien
 * hasil pencarian, panggil clear saat komponen disembunyikan atau dilepas.
 */
export function useClearOnHide(clear: () => void) {
  const ref = useRef(clear);
  useEffect(() => {
    ref.current = clear;
  });
  useEffect(() => () => ref.current(), []);
}
