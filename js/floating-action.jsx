import {createPortal} from 'react-dom';
import {Button, Icon} from '@gravity-ui/uikit';

export default function FloatingAction({icon, label, onClick}) {
  return createPortal(<Button className="gravity-floating-action" size="xl" view="action" aria-label={label} onClick={onClick}>
    <Icon data={icon} size={20}/>
  </Button>,document.body);
}
