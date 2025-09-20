import DialogueLineNode from './DialogueLineNode'
import DialogueChoiceNode from './DialogueChoiceNode'
import DialogueActionNode from './DialogueActionNode'
import DialogueJumpNode from './DialogueJumpNode'
import DialogueEndNode from './DialogueEndNode'

export const nodeTypes = {
  line: DialogueLineNode,
  choice_hub: DialogueChoiceNode,
  action: DialogueActionNode,
  jump: DialogueJumpNode,
  end: DialogueEndNode,
}

export {
  DialogueLineNode,
  DialogueChoiceNode,
  DialogueActionNode,
  DialogueJumpNode,
  DialogueEndNode,
}