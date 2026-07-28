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

import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { MainLayout, Board } from './components';
import { useDeployedBoardContext } from './hooks';
import { type BoardDeployment } from './contexts';
import { type Observable } from 'rxjs';

/** Placeholder that stands in for a real contract address until one is deployed. */
const CONTRACT_ADDRESS_PLACEHOLDER = '<YOUR_DEPLOYED_CONTRACT_ADDRESS>';

/**
 * The root anonymous feedback board application component.
 *
 * @remarks
 * The {@link App} component requires a `<DeployedBoardProvider />` parent in order to retrieve
 * information about current feedback board deployments.
 *
 * @internal
 */
const App: React.FC = () => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployments, setBoardDeployments] = useState<Array<Observable<BoardDeployment>>>([]);

  useEffect(() => {
    const subscription = boardApiProvider.boardDeployments$.subscribe(setBoardDeployments);

    return () => {
      subscription.unsubscribe();
    };
  }, [boardApiProvider]);

  // If a real contract address has been configured (i.e., VITE_CONTRACT_ADDRESS no longer holds
  // the placeholder), automatically join it on load instead of requiring a manual "Join" click.
  useEffect(() => {
    const configuredContractAddress = import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined;
    if (configuredContractAddress && configuredContractAddress !== CONTRACT_ADDRESS_PLACEHOLDER) {
      boardApiProvider.resolve(configuredContractAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardApiProvider]);

  return (
    <Box sx={{ background: '#000', minHeight: '100vh' }}>
      <MainLayout>
        {boardDeployments.map((boardDeployment, idx) => (
          <div data-testid={`board-${idx}`} key={`board-${idx}`}>
            <Board boardDeployment$={boardDeployment} />
          </div>
        ))}
        <div data-testid="board-start">
          <Board />
        </div>
      </MainLayout>
    </Box>
  );
};

export default App;
