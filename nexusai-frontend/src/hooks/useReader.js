import { useContext } from 'react';
import { ReaderContext } from '../context/readerContext';

export default function useReader() {
  return useContext(ReaderContext);
}
