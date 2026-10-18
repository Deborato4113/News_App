import { useContext } from 'react';
import { LibraryContext } from '../context/libraryContext';

export default function useLibrary() {
  return useContext(LibraryContext);
}
