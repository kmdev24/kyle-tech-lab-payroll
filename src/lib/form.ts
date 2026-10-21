import { startTransition, type FormEvent } from "react";

/**
 * React 19 resets a <form action={...}> after every submission, which wipes
 * what the user typed when the server returns a validation error. Submitting
 * through onSubmit keeps the inputs intact.
 */
export function submitWithoutReset(action: (form: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };
}
