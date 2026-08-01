'use client';
import { useState, useEffect } from 'react';
import { db } from './index.js';

export function useIndexedDBCategory(
  slug,
  staticCategory,
  staticCommands,
  staticAllCategories = []
) {
  const [category, setCategory] = useState(staticCategory);
  const [commands, setCommands] = useState(staticCommands || []);
  const [allCategories, setAllCategories] = useState(staticAllCategories || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const localCat = await db.categories.get(slug);
        const localAllCats = await db.categories.toArray();
        const localCmds = await db.commands.where('category').startsWith(slug).toArray();

        if (!active) return;

        if (localCat) {
          setCategory(localCat);
        }
        if (localAllCats.length > 0) {
          setAllCategories(localAllCats);
        }
        if (localCmds.length > 0) {
          setCommands(localCmds);
        }
      } catch {
        // Fallback to static data (default state)
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [slug]);

  return { category, commands, allCategories, loading };
}

export function useIndexedDBCommand(slug, staticCommand, staticAllCategories = []) {
  const [command, setCommand] = useState(staticCommand);
  const [allCategories, setAllCategories] = useState(staticAllCategories || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const localCmd = await db.commands.get(slug);
        const localAllCats = await db.categories.toArray();

        if (!active) return;

        if (localCmd) {
          setCommand(localCmd);
        }
        if (localAllCats.length > 0) {
          setAllCategories(localAllCats);
        }
      } catch {
        // Fallback to static data (default state)
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [slug]);

  return { command, allCategories, loading };
}

export function useIndexedDBWorkflow(slug, staticWorkflow, staticAllCategories = []) {
  const [workflow, setWorkflow] = useState(staticWorkflow);
  const [allCategories, setAllCategories] = useState(staticAllCategories || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const localWf = await db.workflows.get(slug);
        const localAllCats = await db.categories.toArray();

        if (!active) return;

        if (localWf) {
          setWorkflow(localWf);
        }
        if (localAllCats.length > 0) {
          setAllCategories(localAllCats);
        }
      } catch {
        // Fallback to static data
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [slug]);

  return { workflow, allCategories, loading };
}
