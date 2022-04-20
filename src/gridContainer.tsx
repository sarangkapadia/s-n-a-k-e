import React, { useCallback, useEffect, useState } from "react";
//import { Button } from "./button";
import { useInterval } from "./useInterval";
import { GridRenderer } from "./gridRenderer";
import { useSwipeable } from "react-swipeable";
import { Grid, Direction, Role } from "./grid";
import { DebugGrid } from "./debug/debugGrid";
import "./style/gridContainer.css";
import { WordTiles } from "./wordtiles";
import { ModalPage } from "./components/modals/modalPage";
import snakeSmile from "./snakeSmile.gif";

// move this to a useEffect
const root = document.querySelector(":root")!;
const rootStyle = getComputedStyle(root);

const tickCount = rootStyle.getPropertyValue("--tick");
const tickCountMs =
  parseFloat(tickCount.substr(0, tickCount.length - 1)) * 1000;

const url: URL = new URL(window.location.href);
const urlSearchParams = new URLSearchParams(url.search);

const gridObj = new Grid();
gridObj.initGridData();

const gridSize = gridObj.getGridSize();
const grid = gridObj.getGrid();

interface IGridContainer {
  showInstructions: boolean;
  onCloseInstructions: () => void;
}
export const GridContainer: React.FunctionComponent<IGridContainer> = (
  props
) => {
  const { showInstructions, onCloseInstructions } = props;
  const [snakeEnds, setSnakeEnds] = useState(gridObj.getSnake().getSnakeEnds());
  const [playing, setPlaying] = useState(false);
  const [debug, setDebug] = useState(false);
  const [currentLetter, setCurrentLetter] = useState("");
  let movePending = false;
  // add logic in these to detect game end
  const onSwipedLeft = () => {
    if (movePending) return;

    if (!playing) {
      handleOnPlayPauseGame();
      return;
    }

    const currentHeadDir = gridObj.getCurrentHeadDirection();
    if (currentHeadDir === Direction.Left || currentHeadDir === Direction.Right)
      return;
    gridObj.setCurrentHeadDirection(Direction.Left);
    gridObj.setPivotOnCurrentHeadDirection(Direction.Left);
    movePending = true;
  };

  const onSwipedRight = () => {
    if (movePending) return;
    if (!playing) {
      handleOnPlayPauseGame();
      return;
    }
    const currentHeadDir = gridObj.getCurrentHeadDirection();
    if (currentHeadDir === Direction.Left || currentHeadDir === Direction.Right)
      return;
    gridObj.setCurrentHeadDirection(Direction.Right);
    gridObj.setPivotOnCurrentHeadDirection(Direction.Right);
    movePending = true;
  };

  const onSwipedUp = () => {
    if (movePending) return;
    if (!playing) {
      handleOnPlayPauseGame();
      return;
    }
    const currentHeadDir = gridObj.getCurrentHeadDirection();
    if (currentHeadDir === Direction.Down || currentHeadDir === Direction.Up)
      return;
    gridObj.setCurrentHeadDirection(Direction.Up);
    gridObj.setPivotOnCurrentHeadDirection(Direction.Up);
    movePending = true;
  };

  const onSwipedDown = () => {
    if (movePending) return;
    if (!playing) {
      handleOnPlayPauseGame();
      return;
    }
    const currentHeadDir = gridObj.getCurrentHeadDirection();
    if (currentHeadDir === Direction.Down || currentHeadDir === Direction.Up)
      return;
    gridObj.setCurrentHeadDirection(Direction.Down);
    gridObj.setPivotOnCurrentHeadDirection(Direction.Down);
    movePending = true;
  };

  const calculateNewHead = (ends: typeof snakeEnds) => {
    /* ========================= HEAD ==============================*/
    const currentHeadRow = snakeEnds.head.row;
    const currentHeadCol = snakeEnds.head.col;
    const currentHeadDir = gridObj.getCurrentHeadDirection();

    grid[currentHeadRow][currentHeadCol].role = Role.Body; // make current head -> snake body
    grid[currentHeadRow][currentHeadCol].direction = Direction.None; // make current head's dir none

    // now calculate the new position (row, col) for head based on the current head direction.
    let newHeadRow = currentHeadRow;
    let newHeadCol = currentHeadCol;

    switch (currentHeadDir) {
      case Direction.Up: {
        newHeadRow =
          snakeEnds.head.row - 1 < 0 ? gridSize - 1 : snakeEnds.head.row - 1;
        break;
      }
      case Direction.Down: {
        newHeadRow =
          snakeEnds.head.row + 1 >= gridSize ? 0 : snakeEnds.head.row + 1;
        break;
      }
      case Direction.Right: {
        newHeadCol =
          snakeEnds.head.col + 1 >= gridSize ? 0 : snakeEnds.head.col + 1;
        break;
      }
      case Direction.Left: {
        newHeadCol =
          snakeEnds.head.col - 1 < 0 ? gridSize - 1 : snakeEnds.head.col - 1;
        break;
      }
      default: {
        setPlaying(false);
        const error = "Invalid head direction!";
        alert(error);
        throw new Error(error);
      }
    }
    ends.head.row = newHeadRow;
    ends.head.col = newHeadCol;

    // check if new Head is a valid role
    switch (grid[newHeadRow][newHeadCol].role) {
      case Role.Tail:
      case Role.Canvas: {
        grid[newHeadRow][newHeadCol].role = Role.Head; // canvas -> head'
        break;
      }
      case Role.Byte: {
        const expected = gridObj.getExpectedLetter().toUpperCase();
        const landed = grid[newHeadRow][newHeadCol].letter;

        if (landed !== expected) {
          const error = `Wrong letter, expected = ${expected}, letter = ${landed}`;
          alert(error);
          throw new Error(error);
        }

        const currentByteSequence =
          gridObj.getLetterIndex() > 0 ? currentLetter + landed : landed;
        setCurrentLetter(currentByteSequence);

        gridObj.incrementLetterIndex();
        if (gridObj.getLetterIndex() === 0) {
          gridObj.setRandomBytePositions();
        }

        break;
      }
      default:
        setPlaying(false);
        const error = `Head collision with invalid role , ${grid[newHeadRow][newHeadCol].role}`;
        alert(error);
        throw new Error(error);
    }

    grid[newHeadRow][newHeadCol].direction = currentHeadDir; // retain previous head's dir in the new head
  };

  const isHeadOnByte = (ends: typeof snakeEnds): boolean => {
    const currentHeadRow = snakeEnds.head.row;
    const currentHeadCol = snakeEnds.head.col;
    return grid[currentHeadRow][currentHeadCol].role === Role.Byte;
  };

  const calculateNewTail = (ends: typeof snakeEnds) => {
    // no-op if the head is on a byte
    if (isHeadOnByte(snakeEnds)) {
      return;
    }

    /* ========================= TAIL ==============================*/
    const currentTailRow = snakeEnds.tail.row;
    const currentTailCol = snakeEnds.tail.col;
    const pivotDir = grid[currentTailRow][currentTailCol].pivot;
    // override current tail direction if there is a pivot direction left behind by the head at some point.
    const currentTailDir =
      pivotDir !== Direction.None
        ? pivotDir
        : gridObj.getCurrentTailDirection();

    grid[currentTailRow][currentTailCol].role = Role.Canvas; // tail -> canvas
    grid[currentTailRow][currentTailCol].direction = Direction.None; // tail -> canvas dir

    if (pivotDir !== Direction.None)
      grid[currentTailRow][currentTailCol].pivot = Direction.None; // clear pivots as the tail arrives

    let newTailRow = currentTailRow;
    let newTailCol = currentTailCol;

    // now calculate the new position (row, col) for tail based on the current tail direction.
    switch (currentTailDir) {
      case Direction.Up: {
        newTailRow =
          snakeEnds.tail.row - 1 < 0 ? gridSize - 1 : snakeEnds.tail.row - 1;
        break;
      }
      case Direction.Down: {
        newTailRow =
          snakeEnds.tail.row + 1 >= gridSize ? 0 : snakeEnds.tail.row + 1;
        break;
      }
      case Direction.Right: {
        newTailCol =
          snakeEnds.tail.col + 1 >= gridSize ? 0 : snakeEnds.tail.col + 1;
        break;
      }
      case Direction.Left: {
        newTailCol =
          snakeEnds.tail.col - 1 < 0 ? gridSize - 1 : snakeEnds.tail.col - 1;
        break;
      }
      default: {
        setPlaying(false);
        const error = "Invalid tail direction!";
        alert(error);
        throw new Error(error);
      }
    }

    ends.tail.row = newTailRow;
    ends.tail.col = newTailCol;
    grid[newTailRow][newTailCol].role = Role.Tail; // body -> tail
    grid[newTailRow][newTailCol].direction = currentTailDir;
  };

  // calcualte the new snake ends, and assign new roles as necessary
  const getNewEnds = (ends: typeof snakeEnds) => {
    calculateNewTail(ends);
    calculateNewHead(ends);
    return ends;
  };

  const onTick = () => {
    let ends = { ...snakeEnds };
    // set new roles on the new ends
    const newEnds = getNewEnds(ends);
    setSnakeEnds(newEnds);
    // set new ends
    gridObj.getSnake().setSnakeEnds(ends);
    movePending = false;
  };

  useInterval(
    onTick,
    // Delay in milliseconds or null to stop it
    playing ? tickCountMs : null
  );

  useEffect(() => {
    if (showInstructions) setPlaying(false);
  }, [showInstructions]);

  const handleOnPlayPauseGame = useCallback(() => {
    if (showInstructions) {
      // pause and return
      setPlaying(false);
      return;
    }

    if (!playing) {
      const currentTailDir = gridObj.getCurrentTailDirection();
      const currentHeadDir = gridObj.getCurrentHeadDirection();
      // on play first time
      if (
        currentHeadDir === Direction.None &&
        currentTailDir === Direction.None
      ) {
        gridObj.setCurrentTailDirection(Direction.Right);
        gridObj.setCurrentHeadDirection(Direction.Right);
      }
    }

    setPlaying((playing) => !playing);
  }, [playing, showInstructions]);

  const handleOnDebug = useCallback(() => {
    setDebug((debug) => !debug);
  }, []);

  const isDebugMode = () => {
    return urlSearchParams.get("debug") === "true";
  };

  const handlers = useSwipeable({
    onSwipedLeft: onSwipedLeft,
    onSwipedRight: onSwipedRight,
    onSwipedDown: onSwipedDown,
    onSwipedUp: onSwipedUp,
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  return (
    <div {...handlers} className={"game"}>
      <ModalPage
        action={showInstructions}
        onClose={onCloseInstructions}
        title={"How to play"}
      >
        <p>Swipe anywhere on the screen to start the game.</p>
        <p>
          Navigate your snake by swiping left, right, up or down. This will
          change the direction of the snake's head.
        </p>
        <p>
          Steer the snake to capture the letters in the correct order and create
          a 5 letter word using the randomly placed letters. Score 100 points
          per word + bonus for speed.
        </p>
        <p>Avoid colliding the snake's head with it's own body.</p>

        <img src={snakeSmile} alt={"funny snake GIF"} />
      </ModalPage>
      <div className={"gridContainer"}>
        {debug ? (
          <DebugGrid grid={grid} />
        ) : (
          <GridRenderer
            grid={grid}
            currentHeadDirection={gridObj.getCurrentHeadDirection()}
            currentTailDirection={gridObj.getCurrentTailDirection()}
            currentTailPivot={gridObj.getPivotDirectionOnCurrentTail()}
          />
        )}
      </div>
      {/* <div className={"appUtils"}>
        {
          <Button
            onClick={handleOnPlayPauseGame}
            label={playing ? "Pause" : "Play"}
          />
        }
        {isDebugMode() ? (
          <Button
            onClick={handleOnDebug}
            label={debug ? "Debug Off" : "Debug On"}
          />
        ) : null}
      </div> */}
      <WordTiles bytes={currentLetter} />
    </div>
  );
};
