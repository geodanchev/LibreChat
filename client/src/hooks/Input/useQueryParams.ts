import { useEffect, useCallback, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { useSearchParams } from 'react-router-dom';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import {
  QueryKeys,
  EModelEndpoint,
  isAgentsEndpoint,
  tQueryParamsSchema,
  isAssistantsEndpoint,
  PermissionBits,
} from 'librechat-data-provider';
import type {
  TPreset,
  TEndpointsConfig,
  TStartupConfig,
  AgentListResponse,
} from 'librechat-data-provider';
import type { ZodAny } from 'zod';
import { getConvoSwitchLogic, getModelSpecIconURL, removeUnavailableTools, logger } from '~/utils';
import { useAuthContext, useAgentsMap, useDefaultConvo, useSubmitMessage } from '~/hooks';
import { useChatContext, useChatFormContext } from '~/Providers';
import { useGetAgentByIdQuery } from '~/data-provider';
import store from '~/store';
import { useSetRecoilState } from 'recoil';

/**
 * Parses query parameter values, converting strings to their appropriate types.
 * Handles boolean strings, numbers, and preserves regular strings.
 */
const parseQueryValue = (value: string) => {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (!isNaN(Number(value))) {
    return Number(value);
  }
  return value;
};

/**
 * Processes and validates URL query parameters using schema definitions.
 * Extracts valid settings based on tQueryParamsSchema and handles special endpoint cases
 * for assistants and agents.
 */
const processValidSettings = (queryParams: Record<string, string>) => {
  const validSettings = {} as TPreset;

  Object.entries(queryParams).forEach(([key, value]) => {
    try {
      const schema = tQueryParamsSchema.shape[key] as ZodAny | undefined;
      if (schema) {
        const parsedValue = parseQueryValue(value);
        const validValue = schema.parse(parsedValue);
        validSettings[key] = validValue;
      }
    } catch (error) {

    }
  });

  if (
    validSettings.assistant_id != null &&
    validSettings.assistant_id &&
    !isAssistantsEndpoint(validSettings.endpoint)
  ) {
    validSettings.endpoint = EModelEndpoint.assistants;
  }
  if (
    validSettings.agent_id != null &&
    validSettings.agent_id &&
    !isAgentsEndpoint(validSettings.endpoint)
  ) {
    validSettings.endpoint = EModelEndpoint.agents;
  }

  return validSettings;
};

const injectAgentIntoAgentsMap = (queryClient: QueryClient, agent: any) => {
  const editCacheKey = [QueryKeys.agents, { requiredPermission: PermissionBits.EDIT }];
  const editCache = queryClient.getQueryData<AgentListResponse>(editCacheKey);

  if (editCache?.data && !editCache.data.some((cachedAgent) => cachedAgent.id === agent.id)) {
    // Inject agent into EDIT cache so dropdown can display it
    const updatedCache = {
      ...editCache,
      data: [agent, ...editCache.data],
    };
    queryClient.setQueryData(editCacheKey, updatedCache);
    logger.log('agent', 'Injected URL agent into cache:', agent);
  }
};

/**
 * Hook that processes URL query parameters to initialize chat with specified settings and prompt.
 * Handles model switching, prompt auto-filling, and optional auto-submission with race condition protection.
 * Supports immediate or deferred submission based on whether settings need to be applied first.
 */
export default function useQueryParams({
  textAreaRef,
}: {
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const maxAttempts = 50;
  const attemptsRef = useRef(0);
  const MAX_SETTINGS_WAIT_MS = 3000;
  const processedRef = useRef(false);
  const pendingSubmitRef = useRef(false);
  const settingsAppliedRef = useRef(false);
  const submissionHandledRef = useRef(false);
  const promptTextRef = useRef<string | null>(null);
  const [validSettings, setValidSettings] = useState<TPreset | null>(null);
  // Debug: log validSettings on every render
  useEffect(() => {
  }, [validSettings]);
  const validSettingsRef = useRef<TPreset | null>(null);
  const settingsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const methods = useChatFormContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const getDefaultConversation = useDefaultConvo();
  const modularChat = useRecoilValue(store.modularChat);
  const availableTools = useRecoilValue(store.availableTools);
  const { submitMessage } = useSubmitMessage();
  const setIsTemporary = useSetRecoilState(store.isTemporary);
  const isTemporaryGlobal = useRecoilValue(store.isTemporary);
  const tempFlagRef = useRef(false);

  const queryClient = useQueryClient();
  const { conversation, newConversation } = useChatContext();

  // Extract agent_id from URL for proactive fetching
  const urlAgentId = searchParams.get('agent_id') || '';

  // Use the existing query hook to fetch agent if present in URL
  const { data: urlAgent } = useGetAgentByIdQuery(urlAgentId, {
    enabled: !!urlAgentId, // Only fetch if agent_id exists in URL
  });

  /**
   * Applies settings from URL query parameters to create a new conversation.
   * Handles model spec lookup, endpoint normalization, and conversation switching logic.
   * Ensures tools compatibility and preserves existing conversation when appropriate.
   */
  const newQueryConvo = useCallback(
    (_newPreset?: TPreset) => {
      if (!_newPreset) {
        return;
      }
      let newPreset = removeUnavailableTools(_newPreset, availableTools);
      if (newPreset.spec != null && newPreset.spec !== '') {
        const startupConfig = queryClient.getQueryData<TStartupConfig>([QueryKeys.startupConfig]);
        const modelSpecs = startupConfig?.modelSpecs?.list ?? [];
        const spec = modelSpecs.find((s) => s.name === newPreset.spec);
        if (!spec) {
          return;
        }
        const { preset } = spec;
        preset.iconURL = getModelSpecIconURL(spec);
        preset.spec = spec.name;
        newPreset = preset;
      }

      let newEndpoint = newPreset.endpoint ?? '';
      const endpointsConfig = queryClient.getQueryData<TEndpointsConfig>([QueryKeys.endpoints]);

      if (newEndpoint && endpointsConfig && !endpointsConfig[newEndpoint]) {
        const normalizedNewEndpoint = newEndpoint.toLowerCase();
        for (const [key, value] of Object.entries(endpointsConfig)) {
          if (
            value &&
            typeof value === 'object' &&
            'type' in value &&
            (value as { type?: string }).type === EModelEndpoint.custom &&
            key.toLowerCase() === normalizedNewEndpoint
          ) {
            newEndpoint = key;
            newPreset.endpoint = key;
            newPreset.endpointType = EModelEndpoint.custom;
            break;
          }
        }
      }

      const {
        template,
        shouldSwitch,
        isNewModular,
        newEndpointType,
        isCurrentModular,
        isExistingConversation,
      } = getConvoSwitchLogic({
        newEndpoint,
        modularChat,
        conversation,
        endpointsConfig,
      });

      let resetParams = {};
      if (newPreset.spec == null) {
        template.spec = null;
        template.iconURL = null;
        template.modelLabel = null;
        resetParams = { spec: null, iconURL: null, modelLabel: null };
        newPreset = { ...newPreset, ...resetParams };
      }

      const isModular = isCurrentModular && isNewModular && shouldSwitch;
      if (isExistingConversation && isModular) {
        template.endpointType = newEndpointType as EModelEndpoint | undefined;

        const currentConvo = getDefaultConversation({
          /* target endpointType is necessary to avoid endpoint mixing */
          conversation: {
            ...(conversation ?? {}),
            endpointType: template.endpointType,
            ...resetParams,
          },
          preset: template,
          cleanOutput: newPreset.spec != null && newPreset.spec !== '',
        });

        /* We don't reset the latest message, only when changing settings mid-converstion */
        logger.log('conversation', 'Switching conversation from query params', currentConvo);
        newConversation({
          template: currentConvo,
          preset: newPreset,
          keepLatestMessage: true,
          keepAddedConvos: true,
        });
        return;
      }

      newConversation({ preset: newPreset, keepAddedConvos: true });
    },
    [
      queryClient,
      modularChat,
      conversation,
      availableTools,
      newConversation,
      getDefaultConversation,
    ],
  );

  /**
   * Checks if all settings from URL parameters have been successfully applied to the conversation.
   * Compares values from validSettings against the current conversation state, handling special properties.
   * Returns true only when all relevant settings match the target values.
   */
  const areSettingsApplied = useCallback(() => {
if (!validSettingsRef.current || !conversation) {
  return false;
}

    for (const [key, value] of Object.entries(validSettingsRef.current)) {
      if (['presetOverride', 'iconURL', 'spec', 'modelLabel'].includes(key)) {
        continue;
      }

      if (conversation[key] !== value) {
        return false;
      }
    }

    return true;
  }, [conversation]);

  /**
   * Processes message submission exactly once, preventing duplicate submissions.
   * Sets the prompt text, submits the message, and cleans up URL parameters afterward.
   * Has internal guards to ensure it only executes once regardless of how many times it's called.
   */
const processSubmission = useCallback(() => {
if (submissionHandledRef.current || !pendingSubmitRef.current || !promptTextRef.current) {
  return;
}

    submissionHandledRef.current = true;
    pendingSubmitRef.current = false;

    // Set the prompt in the input before submitting
    methods.setValue('text', promptTextRef.current, { shouldValidate: true });

    methods.handleSubmit((data) => {
      if (data.text?.trim()) {
        submitMessage(data);

        // Only after successful submission, clean up the URL and clear the prompt
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);

        // Optionally, clear the promptTextRef here if needed
        promptTextRef.current = null;
      }
    })();
  }, [methods, submitMessage, conversation]);

// Refactored: Move interval logic into useEffect and synchronize with React state updates
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const processQueryParams = () => {
      const queryParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });

      // Support both 'prompt' and 'q' as query parameters, with 'prompt' taking precedence
      const decodedPrompt = queryParams.prompt || queryParams.q || '';
      const shouldAutoSubmit = queryParams.submit?.toLowerCase() === 'true';
      const isTemporary = queryParams.temp?.toLowerCase() === 'true';
      delete queryParams.prompt;
      delete queryParams.q;
      delete queryParams.submit;
      delete queryParams.temp;
      const validSettings = processValidSettings(queryParams);

      // Always reset isTemporary to false unless temp=true is present
      if (isTemporary) {
        validSettings.isTemporary = true;
        setIsTemporary(true);
        tempFlagRef.current = true;
      } else {
        setIsTemporary(false);
        tempFlagRef.current = false;
      }

      return { decodedPrompt, validSettings, shouldAutoSubmit };
    };

    let attempts = 0;
    intervalId = setInterval(() => {
      if (processedRef.current || attempts >= maxAttempts) {
        if (intervalId) clearInterval(intervalId);
        return;
      }

      attempts += 1;

      if (!textAreaRef.current) {
        return;
      }
      const startupConfig = queryClient.getQueryData<TStartupConfig>([QueryKeys.startupConfig]);
      if (!startupConfig) {
        return;
      }

      const { decodedPrompt, validSettings, shouldAutoSubmit } = processQueryParams();

      // Store settings for later comparison
      if (Object.keys(validSettings).length > 0 || (shouldAutoSubmit && decodedPrompt)) {
        validSettingsRef.current = validSettings;
        setValidSettings(validSettings); // This will trigger the auto-submit effect
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }

      // Save the prompt text for later use if needed
      if (decodedPrompt) {
        promptTextRef.current = decodedPrompt;
      }

      // Only mark as processed if not auto-submitting, otherwise wait for settings to apply
      if (!shouldAutoSubmit) {
        submissionHandledRef.current = true;
        processedRef.current = true;
        // Set the prompt in the input if present
        if (decodedPrompt) {
          methods.setValue('text', decodedPrompt, { shouldValidate: true });
          textAreaRef.current.focus();
          textAreaRef.current.setSelectionRange(decodedPrompt.length, decodedPrompt.length);
        }
        // Clean up URL params (including temp) after processing
        const paramString = searchParams.toString();
        const currentParams = new URLSearchParams(paramString);
        currentParams.delete('prompt');
        currentParams.delete('q');
        currentParams.delete('submit');
        currentParams.delete('temp');
        setSearchParams(currentParams, { replace: true });
        const newUrl = window.location.pathname + (currentParams.toString() ? '?' + currentParams.toString() : '');
        window.history.replaceState({}, '', newUrl);
        return;
      } else {
        // If auto-submitting, set pendingSubmitRef so the effect can trigger submission.
        if (shouldAutoSubmit && decodedPrompt) {
          pendingSubmitRef.current = true;
        }
      }

      // If auto-submitting, wait for settings to be applied before processing submission
      if (Object.keys(validSettings).length > 0) {
        if (tempFlagRef.current) {
          if (isTemporaryGlobal) {
            newQueryConvo(validSettings);
          }
        } else {
          newQueryConvo(validSettings);
        }
      }
    }, 100);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (settingsTimeoutRef.current) {
        clearTimeout(settingsTimeoutRef.current);
      }
    };
  }, [
    searchParams,
    methods,
    textAreaRef,
    newQueryConvo,
    newConversation,
    submitMessage,
    setSearchParams,
    queryClient,
    processSubmission,
    isTemporaryGlobal,
  ]);

  useEffect(() => {
    // Log all guard values at the start of the effect

    // Only proceed if we've already processed URL parameters but haven't yet handled submission
    if (
      !processedRef.current &&
      !submissionHandledRef.current &&
      !settingsAppliedRef.current &&
      conversation &&
      promptTextRef.current // <-- Only run if prompt is available
    ) {
      validSettingsRef.current = validSettings;

      // Determine if we should allow submission even if areSettingsApplied is false
      const allSettingsApplied = validSettings ? areSettingsApplied() : true;
      const onlyIsTemporary =
        validSettings &&
        Object.keys(validSettings).length === 1 &&
        validSettings.isTemporary === true;

      // Allow submission if:
      // - allSettingsApplied (original logic)
      // - OR only setting is isTemporary and it matches the global state
      // - OR there are no settings but a prompt and submit=true are present
      const allowSubmission =
        allSettingsApplied ||
        (onlyIsTemporary && isTemporaryGlobal) ||
        (!validSettings && promptTextRef.current);



      if (allowSubmission) {
        settingsAppliedRef.current = true;

        // If pending auto-submit, process it now
        if (pendingSubmitRef.current || promptTextRef.current) {
          // Set the prompt in the input before submitting
          if (promptTextRef.current) {
            methods.setValue('text', promptTextRef.current, { shouldValidate: true });
            textAreaRef.current?.focus();
            textAreaRef.current?.setSelectionRange(promptTextRef.current.length, promptTextRef.current.length);
          }
          pendingSubmitRef.current = true;
          processSubmission();

          // Clean up URL params (including temp) after submission
          const paramString = searchParams.toString();
          const currentParams = new URLSearchParams(paramString);
          currentParams.delete('prompt');
          currentParams.delete('q');
          currentParams.delete('submit');
          currentParams.delete('temp');
          setSearchParams(currentParams, { replace: true });
          const newUrl = window.location.pathname + (currentParams.toString() ? '?' + currentParams.toString() : '');
          window.history.replaceState({}, '', newUrl);

          processedRef.current = true;
        }
      }
    }
  }, [conversation, processSubmission, areSettingsApplied, methods, searchParams, setSearchParams, textAreaRef, validSettings, isTemporaryGlobal]);


  const { isAuthenticated } = useAuthContext();
  const agentsMap = useAgentsMap({ isAuthenticated });
  useEffect(() => {
    if (urlAgent) {
      injectAgentIntoAgentsMap(queryClient, urlAgent);
    }
  }, [urlAgent, queryClient, agentsMap]);
}
