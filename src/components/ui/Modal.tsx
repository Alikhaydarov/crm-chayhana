interface ModalProps {
	onClose: () => void
	children: React.ReactNode
}

export function Modal({ onClose, children }: ModalProps) {
	return (
		<div className='modal-backdrop' onClick={onClose}>
			<div className='modal-box' onClick={e => e.stopPropagation()}>
				<div className='modal-drag' />
				{children}
			</div>
		</div>
	)
}
