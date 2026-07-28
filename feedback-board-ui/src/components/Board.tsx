// This file is part of the feedback-board example.
// Copyright (C) Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useCallback, useEffect, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import {
  Backdrop,
  Box,
  Button,
  Chip,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
  TextField,
} from '@mui/material';
import AdminIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import MemberIcon from '@mui/icons-material/VerifiedUserOutlined';
import GuestIcon from '@mui/icons-material/PersonOutlineOutlined';
import CopyIcon from '@mui/icons-material/ContentPasteOutlined';
import StopIcon from '@mui/icons-material/HighlightOffOutlined';
import { type FeedbackBoardDerivedState, type DeployedFeedbackBoardAPI } from '../../../api/src/index';
import { useDeployedBoardContext } from '../hooks';
import { type BoardDeployment } from '../contexts';
import { type Observable } from 'rxjs';
import { EmptyCardContent } from './Board.EmptyCardContent';

/** The props required by the {@link Board} component. */
export interface BoardProps {
  /** The observable anonymous feedback board deployment. */
  boardDeployment$?: Observable<BoardDeployment>;
}

/**
 * Provides the UI for a deployed anonymous feedback board contract; allowing an admin to be
 * registered, members to be whitelisted, and feedback to be submitted anonymously, following the
 * rules enforced by the underlying Compact contract.
 *
 * @remarks
 * With no `boardDeployment$` observable, the component will render a UI that allows the user to create
 * or join feedback boards. It requires a `<DeployedBoardProvider />` to be in scope in order to manage
 * these additional boards. It does this by invoking the `resolve(...)` method on the currently in-
 * scope `DeployedBoardContext`.
 *
 * When a `boardDeployment$` observable is received, the component begins by rendering a skeletal view of
 * itself, along with a loading background. It does this until the board deployment receives a
 * `DeployedFeedbackBoardAPI` instance, upon which it will then subscribe to its `state$` observable in
 * order to start receiving changes in the feedback board state (i.e., when someone submits feedback).
 */
export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployment, setBoardDeployment] = useState<BoardDeployment>();
  const [deployedBoardAPI, setDeployedBoardAPI] = useState<DeployedFeedbackBoardAPI>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [boardState, setBoardState] = useState<FeedbackBoardDerivedState>();
  const [feedbackPrompt, setFeedbackPrompt] = useState<string>('');
  const [newMemberKeyPrompt, setNewMemberKeyPrompt] = useState<string>('');
  const [isWorking, setIsWorking] = useState(!!boardDeployment$);

  // Two simple callbacks that call `resolve(...)` to either deploy or join an anonymous feedback
  // board contract. Since the `DeployedBoardContext` will create a new board and update the UI, we
  // don't have to do anything further once we've called `resolve`.
  const onCreateBoard = useCallback(() => boardApiProvider.resolve(), [boardApiProvider]);
  const onJoinBoard = useCallback(
    (contractAddress: ContractAddress) => boardApiProvider.resolve(contractAddress),
    [boardApiProvider],
  );

  const runAction = useCallback(
    async (action: () => Promise<void>) => {
      try {
        setIsWorking(true);
        await action();
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setIsWorking(false);
      }
    },
    [setErrorMessage, setIsWorking],
  );

  const onRegisterAdmin = useCallback(async () => {
    if (deployedBoardAPI) {
      await runAction(() => deployedBoardAPI.registerAdmin());
    }
  }, [deployedBoardAPI, runAction]);

  const onAddMember = useCallback(async () => {
    if (deployedBoardAPI && newMemberKeyPrompt) {
      await runAction(() => deployedBoardAPI.addMember(Buffer.from(newMemberKeyPrompt.trim(), 'hex')));
      setNewMemberKeyPrompt('');
    }
  }, [deployedBoardAPI, newMemberKeyPrompt, runAction]);

  const onOpenNewRound = useCallback(async () => {
    if (deployedBoardAPI) {
      await runAction(() => deployedBoardAPI.openNewRound());
    }
  }, [deployedBoardAPI, runAction]);

  const onSubmitFeedback = useCallback(async () => {
    if (deployedBoardAPI && feedbackPrompt) {
      await runAction(() => deployedBoardAPI.submitFeedback(feedbackPrompt));
      setFeedbackPrompt('');
    }
  }, [deployedBoardAPI, feedbackPrompt, runAction]);

  const onCopyContractAddress = useCallback(async () => {
    if (deployedBoardAPI) {
      await navigator.clipboard.writeText(deployedBoardAPI.deployedContractAddress);
    }
  }, [deployedBoardAPI]);

  const onCopyOwnMemberKey = useCallback(async () => {
    if (boardState) {
      await navigator.clipboard.writeText(toHex(boardState.ownMemberKey));
    }
  }, [boardState]);

  // Subscribes to the `boardDeployment$` observable so that we can receive updates on the deployment.
  useEffect(() => {
    if (!boardDeployment$) {
      return;
    }

    const subscription = boardDeployment$.subscribe(setBoardDeployment);

    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment$]);

  // Subscribes to the `state$` observable on a `DeployedFeedbackBoardAPI` if we receive one, allowing
  // the component to receive updates to the change in contract state; otherwise we update the UI to
  // reflect the error that was received instead.
  useEffect(() => {
    if (!boardDeployment) {
      return;
    }
    if (boardDeployment.status === 'in-progress') {
      return;
    }

    setIsWorking(false);

    if (boardDeployment.status === 'failed') {
      setErrorMessage(
        boardDeployment.error.message.length ? boardDeployment.error.message : 'Encountered an unexpected error.',
      );
      return;
    }

    // We need the board API as well as subscribing to its `state$` observable, so that we can invoke
    // the various contract circuits later.
    setDeployedBoardAPI(boardDeployment.api);
    const subscription = boardDeployment.api.state$.subscribe(setBoardState);
    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment, setIsWorking, setErrorMessage, setDeployedBoardAPI]);

  const hasAdmin = !!boardState && toHex(boardState.admin) !== toHex(new Uint8Array(32));

  return (
    <Card sx={{ position: 'relative', width: 340, minWidth: 340, minHeight: 480 }} color="primary">
      {!boardDeployment$ && <EmptyCardContent onCreateBoardCallback={onCreateBoard} onJoinBoardCallback={onJoinBoard} />}

      {boardDeployment$ && (
        <React.Fragment>
          <Backdrop
            sx={{ position: 'absolute', color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={isWorking}
          >
            <CircularProgress data-testid="board-working-indicator" />
          </Backdrop>
          <Backdrop
            sx={{ position: 'absolute', color: '#ff0000', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={!!errorMessage}
            onClick={() => setErrorMessage(undefined)}
          >
            <StopIcon fontSize="large" />
            <Typography component="div" data-testid="board-error-message">
              {errorMessage}
            </Typography>
          </Backdrop>
          <CardHeader
            avatar={
              boardState ? (
                boardState.isAdmin ? (
                  <AdminIcon data-testid="role-admin-icon" />
                ) : boardState.isMember ? (
                  <MemberIcon data-testid="role-member-icon" />
                ) : (
                  <GuestIcon data-testid="role-guest-icon" />
                )
              ) : (
                <Skeleton variant="circular" width={20} height={20} />
              )
            }
            titleTypographyProps={{ color: 'primary' }}
            title={toShortFormatContractAddress(deployedBoardAPI?.deployedContractAddress) ?? 'Loading...'}
            action={
              deployedBoardAPI?.deployedContractAddress ? (
                <IconButton title="Copy contract address" onClick={onCopyContractAddress}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              ) : (
                <Skeleton variant="circular" width={20} height={20} />
              )
            }
          />
          <CardContent>
            {boardState ? (
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip size="small" label={`Round ${boardState.round}`} color="primary" variant="outlined" />
                  <Chip size="small" label={`${boardState.memberCount} member(s)`} color="primary" variant="outlined" />
                </Stack>

                <Divider />

                <Box sx={{ maxHeight: 160, overflowY: 'auto' }} data-testid="board-feedback-list">
                  {boardState.feedbacks.length ? (
                    <List dense disablePadding>
                      {boardState.feedbacks.map((feedback) => (
                        <ListItem key={feedback.id.toString()} disableGutters>
                          <ListItemText
                            slotProps={{ primary: { color: 'primary' } }}
                            primary={feedback.content}
                            secondary={`#${feedback.id}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="primary.dark">
                      No feedback submitted yet.
                    </Typography>
                  )}
                </Box>

                <Divider />

                {!hasAdmin && (
                  <Button
                    data-testid="board-register-admin-btn"
                    variant="outlined"
                    size="small"
                    onClick={onRegisterAdmin}
                  >
                    Register as admin
                  </Button>
                )}

                {boardState.isMember && !boardState.hasSubmittedThisRound && (
                  <Stack spacing={1}>
                    <TextField
                      data-testid="board-feedback-prompt"
                      variant="outlined"
                      focused
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={4}
                      placeholder="Submit anonymous feedback"
                      size="small"
                      color="primary"
                      value={feedbackPrompt}
                      slotProps={{ htmlInput: { style: { color: 'black' } } }}
                      onChange={(e) => setFeedbackPrompt(e.target.value)}
                    />
                    <Button
                      data-testid="board-submit-feedback-btn"
                      variant="contained"
                      size="small"
                      disabled={!feedbackPrompt.length}
                      onClick={onSubmitFeedback}
                    >
                      Submit feedback
                    </Button>
                  </Stack>
                )}

                {boardState.isMember && boardState.hasSubmittedThisRound && (
                  <Typography variant="body2" color="primary.dark">
                    You've already submitted feedback this round.
                  </Typography>
                )}

                {!boardState.isMember && (
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="primary.dark">
                      You aren't a registered member yet. Share your member key with the admin:
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ wordBreak: 'break-all' }} color="primary">
                        {toHex(boardState.ownMemberKey)}
                      </Typography>
                      <IconButton title="Copy your member key" size="small" onClick={onCopyOwnMemberKey}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                )}

                {boardState.isAdmin && (
                  <Stack spacing={1}>
                    <Divider>
                      <Chip size="small" label="Admin panel" />
                    </Divider>
                    <TextField
                      data-testid="board-new-member-prompt"
                      variant="outlined"
                      focused
                      fullWidth
                      placeholder="New member's public key (hex)"
                      size="small"
                      color="primary"
                      value={newMemberKeyPrompt}
                      slotProps={{ htmlInput: { style: { color: 'black' } } }}
                      onChange={(e) => setNewMemberKeyPrompt(e.target.value)}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        data-testid="board-add-member-btn"
                        variant="outlined"
                        size="small"
                        disabled={!newMemberKeyPrompt.length}
                        onClick={onAddMember}
                      >
                        Add member
                      </Button>
                      <Button data-testid="board-open-round-btn" variant="outlined" size="small" onClick={onOpenNewRound}>
                        Open new round
                      </Button>
                    </Stack>
                  </Stack>
                )}
              </Stack>
            ) : (
              <Skeleton variant="rectangular" width={300} height={160} />
            )}
          </CardContent>
        </React.Fragment>
      )}
    </Card>
  );
};

/** @internal */
const toShortFormatContractAddress = (contractAddress: ContractAddress | undefined): React.ReactElement | undefined =>
  // Returns a new string made up of the first, and last, 8 characters of a given contract address.
  contractAddress ? (
    <span data-testid="board-address">
      0x{contractAddress?.replace(/^[A-Fa-f0-9]{6}([A-Fa-f0-9]{8}).*([A-Fa-f0-9]{8})$/g, '$1...$2')}
    </span>
  ) : undefined;
