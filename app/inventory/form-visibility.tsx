"use client";

import * as React from "react";

import { Button } from "@/app/components/ui/button";

// Whether the add/edit part form is shown next to the inventory table.
// Shared between the header toggle and the form; remembered per browser.
const STORAGE_KEY = "inventory:showForm";

type FormVisibility = {
  showForm: boolean;
  setShowForm: (show: boolean) => void;
};

const FormVisibilityContext = React.createContext<FormVisibility>({
  showForm: false,
  setShowForm: () => {},
});

export function FormVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showForm, setShowFormState] = React.useState(true);

  React.useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "false") {
        setShowFormState(false);
      }
    } catch {}
  }, []);

  const setShowForm = React.useCallback((show: boolean) => {
    setShowFormState(show);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(show));
    } catch {}
  }, []);

  return (
    <FormVisibilityContext.Provider value={{ showForm, setShowForm }}>
      {children}
    </FormVisibilityContext.Provider>
  );
}

export const useFormVisibility = () => React.useContext(FormVisibilityContext);

export function ToggleFormButton() {
  const { showForm, setShowForm } = useFormVisibility();
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setShowForm(!showForm)}
      aria-pressed={showForm}
    >
      {showForm ? "Hide editor" : "Add / edit part"}
    </Button>
  );
}
