import {useEffect, useState} from "react";

const useNameSpaceHook = () => {
  const [selectedNamespace, setSelectedNamespace] = useState<string>("");
  const selectEl = document.querySelector('.Select__placeholder');

  function readNamespace(textContent) {
    if (textContent) {
      const namespace = textContent.replace(/^Namespace:\s*/, "");
      setSelectedNamespace(namespace);
    }
  }

  useEffect(() => {
    if (!selectEl || !selectEl.firstChild) return;

    readNamespace(selectEl.textContent);

    const observer = new MutationObserver(() => {
      readNamespace(selectEl.textContent);
    });

    observer.observe(selectEl.firstChild, { characterData: true });

    return () => observer.disconnect();
  }, [selectEl]);

  return {selectedNamespace}
}

export default useNameSpaceHook;
